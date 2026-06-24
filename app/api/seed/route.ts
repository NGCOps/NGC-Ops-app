import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import projectsData from "@/data/projects.json";
import peopleData from "@/data/people.json";
import certTypesData from "@/data/cert-types.json";
import certificationsData from "@/data/certifications.json";
import logisticsData from "@/data/logistics.json";
import shiftPrepData from "@/data/shift-prep.json";

export async function POST() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS cert_types (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS certifications (
        id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        data JSONB NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS logistics (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS shift_prep (
        project_id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `;

    // Seed projects
    for (const p of projectsData) {
      await sql`INSERT INTO projects (id, data) VALUES (${p.id}, ${JSON.stringify(p)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
    }

    // Seed people
    for (const p of peopleData as Array<{ id: string }>) {
      await sql`INSERT INTO people (id, data) VALUES (${p.id}, ${JSON.stringify(p)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
    }

    // Seed cert types
    for (const ct of certTypesData) {
      await sql`INSERT INTO cert_types (id, data) VALUES (${ct.id}, ${JSON.stringify(ct)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
    }

    // Seed certifications
    for (const c of certificationsData as Array<{ id: string; workerId: string }>) {
      await sql`INSERT INTO certifications (id, worker_id, data) VALUES (${c.id}, ${c.workerId}, ${JSON.stringify(c)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
    }

    // Seed logistics
    for (const l of logisticsData as Array<{ id: string }>) {
      await sql`INSERT INTO logistics (id, data) VALUES (${l.id}, ${JSON.stringify(l)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
    }

    // Seed shift prep
    for (const sp of shiftPrepData as Array<{ projectId: string }>) {
      await sql`INSERT INTO shift_prep (project_id, data) VALUES (${sp.projectId}, ${JSON.stringify(sp)}) ON CONFLICT (project_id) DO UPDATE SET data = EXCLUDED.data`;
    }

    return NextResponse.json({ ok: true, message: "Database seeded successfully" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

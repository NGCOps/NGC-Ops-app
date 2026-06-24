import { NextRequest, NextResponse } from "next/server";
import { dbGetProjects, dbSaveProject } from "@/lib/db-data";
import type { Project } from "@/lib/data";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, client, location, description, startDate, endDate, status } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "name, startDate, and endDate are required" }, { status: 400 });
    }

    const projects = await dbGetProjects();
    const baseId = slugify(name);
    let id = baseId;
    let counter = 2;
    while (projects.find((p) => p.id === id)) {
      id = `${baseId}-${counter++}`;
    }

    const newProject: Project = {
      id, name,
      client: client || "",
      location: location || "",
      status: status || "upcoming",
      startDate, endDate,
      description: description || "",
      workerIds: [],
      supervisorId: "jennifer-carter",
    };

    await dbSaveProject(newProject);
    return NextResponse.json({ ok: true, project: newProject });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

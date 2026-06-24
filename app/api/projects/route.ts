import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "projects.json");

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, client, location, description, startDate, endDate, status } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "name, startDate, and endDate are required" }, { status: 400 });
    }

    const projects = JSON.parse(fs.readFileSync(filePath, "utf8"));

    const baseId = slugify(name);
    let id = baseId;
    let counter = 2;
    while (projects.find((p: { id: string }) => p.id === id)) {
      id = `${baseId}-${counter++}`;
    }

    const newProject = {
      id,
      name,
      client: client || "",
      location: location || "",
      status: status || "upcoming",
      startDate,
      endDate,
      description: description || "",
      workerIds: [],
      supervisorId: "jennifer-carter",
    };

    projects.push(newProject);
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    return NextResponse.json({ ok: true, project: newProject });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

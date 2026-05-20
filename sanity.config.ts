"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { dataset, projectId } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemaTypes";

export default defineConfig({
  basePath: "/admin/studio",
  dataset,
  name: "tayloredInstruction",
  plugins: [structureTool()],
  projectId,
  schema: {
    types: schemaTypes,
  },
  title: "Taylored Instruction",
});

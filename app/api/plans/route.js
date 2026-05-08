import { NextResponse } from "next/server";
import { createPlan } from "../../../lib/urgeshift/planEngine.js";
import { createPlanWithLlm } from "../../../lib/urgeshift/llm.js";

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request) {
  const body = await readJson(request);
  const fallbackPlanResponse = createPlan(body);

  if (!fallbackPlanResponse.saveAllowed || fallbackPlanResponse.safety?.crisis) {
    return NextResponse.json(fallbackPlanResponse);
  }

  const result = await createPlanWithLlm({
    ...body,
    fallbackPlanResponse,
    context: {
      ...(body.context || {}),
      ...(fallbackPlanResponse.context || {}),
    },
  });

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { respondToShift } from "../../../../lib/urgeshift/planEngine.js";
import { suggestActivityWithLlm } from "../../../../lib/urgeshift/llm.js";

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request) {
  const body = await readJson(request);
  const result = respondToShift(body);
  const response = body.response || body.action || "next";
  const shouldAskLlm =
    !result.safety?.crisis &&
    !body.selectedOption &&
    !["done", "helped", "stop", "person"].includes(response);

  if (!shouldAskLlm) {
    return NextResponse.json(result);
  }

  const suggestion = await suggestActivityWithLlm({
    context: result.context,
    response,
    fallbackAction: result.action,
  });

  return NextResponse.json({
    ...result,
    action: suggestion.action,
    llm: suggestion.llm,
    reasonCodes: suggestion.llm.used
      ? [...new Set([...(result.reasonCodes || []), "llm-activity"])]
      : result.reasonCodes,
  });
}

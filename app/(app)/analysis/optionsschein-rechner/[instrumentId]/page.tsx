import { OptionsscheinRechnerClient } from "@/components/optionsschein-rechner/OptionsscheinRechnerClient";

export default async function OptionsscheinInstrumentPage({
  params,
}: {
  params: Promise<{ instrumentId: string }>;
}) {
  const resolved = await params;
  return <OptionsscheinRechnerClient initialInstrumentId={resolved.instrumentId} />;
}

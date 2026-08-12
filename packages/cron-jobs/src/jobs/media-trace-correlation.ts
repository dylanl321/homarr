import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { runMediaTraceCorrelationAsync } from "@homarr/media-trace";

import { createCronJob } from "../lib";

export const mediaTraceCorrelationJob = createCronJob("mediaTraceCorrelation", EVERY_5_MINUTES, {
  runOnStart: true,
}).withCallback(async () => {
  await runMediaTraceCorrelationAsync(db);
});

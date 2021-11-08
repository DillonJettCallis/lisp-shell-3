import { Shell } from './shell';
import { applyInspectPatches } from './inspectUtils';

// apply patch exactly once
applyInspectPatches();
void new Shell().run();

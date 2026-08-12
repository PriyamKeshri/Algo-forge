import { algorithmRegistry } from "../registry";
import { stackOperationsPlugin } from "./stack-operations";
import { postfixEvaluationPlugin } from "./postfix-evaluation";
import { prefixEvaluationPlugin } from "./prefix-evaluation";

// Side-effect registration — see ../sorting/index.ts for the pattern and
// why registerReplacing (not register) is used here.
algorithmRegistry.registerReplacing(stackOperationsPlugin);
algorithmRegistry.registerReplacing(postfixEvaluationPlugin);
algorithmRegistry.registerReplacing(prefixEvaluationPlugin);

export { stackOperationsPlugin, postfixEvaluationPlugin, prefixEvaluationPlugin };

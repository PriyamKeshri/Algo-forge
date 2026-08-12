import { algorithmRegistry } from "../registry";
import { bstInsertPlugin } from "./bst-insert";
import { inorderTraversalPlugin } from "./inorder-traversal";
import { preorderTraversalPlugin } from "./preorder-traversal";
import { postorderTraversalPlugin } from "./postorder-traversal";

// Side-effect registration — see ../sorting/index.ts for the pattern and
// why registerReplacing (not register) is used here.
algorithmRegistry.registerReplacing(bstInsertPlugin);
algorithmRegistry.registerReplacing(inorderTraversalPlugin);
algorithmRegistry.registerReplacing(preorderTraversalPlugin);
algorithmRegistry.registerReplacing(postorderTraversalPlugin);

export { bstInsertPlugin, inorderTraversalPlugin, preorderTraversalPlugin, postorderTraversalPlugin };

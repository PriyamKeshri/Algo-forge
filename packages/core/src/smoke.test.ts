import { describe, expect, it } from "vitest";
import { CORE_PACKAGE_NAME } from "./index";

describe("workspace smoke test", () => {
  it("resolves @algoviz/core and runs under the root Vitest config", () => {
    expect(CORE_PACKAGE_NAME).toBe("@algoviz/core");
  });
});

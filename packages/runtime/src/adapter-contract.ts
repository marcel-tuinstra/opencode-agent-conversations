export type PlatformId = "opencode" | "claude-code" | "codex";

export type CapabilitySupport = "native" | "adapter" | "bridge" | "gap";

export type AdapterInstallSpec = {
  type: "copy";
  entries: readonly {
    source: string;
    destination: string;
  }[];
};

export type AdapterRuntimeCapabilities = {
  promptInjection: CapabilitySupport;
  toolGating: CapabilitySupport;
  worktrees: CapabilitySupport;
};

export type AdapterDetectionInput = {
  hasBinary(name: string): boolean;
  pathExists(path: string): boolean;
  homeDir: string;
};

export type AdapterDescriptor = {
  id: PlatformId;
  install: AdapterInstallSpec;
  runtime: AdapterRuntimeCapabilities;
  detect(input: AdapterDetectionInput): boolean;
};

export function getWorkspaceCompilerOptions<
  CompilerOptions extends object,
  JsxEmit extends number,
  ModuleKind extends number,
  ModuleResolutionKind extends number,
  ScriptTarget extends number,
>({
  compilerOptions,
  jsxEmit,
  moduleKind,
  moduleResolutionKind,
  scriptTarget,
}: {
  compilerOptions: CompilerOptions
  jsxEmit: JsxEmit
  moduleKind: ModuleKind
  moduleResolutionKind: ModuleResolutionKind
  scriptTarget: ScriptTarget
}) {
  return {
    ...compilerOptions,
    allowJs: true,
    allowNonTsExtensions: true,
    baseUrl: "file:///",
    jsx: jsxEmit,
    module: moduleKind,
    moduleResolution: moduleResolutionKind,
    resolveJsonModule: true,
    target: scriptTarget,
  }
}

export function moduleExists(moduleName: string) {
  try {
    require(moduleName);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(`Please install ${moduleName} package manually`);
    }
  }
}

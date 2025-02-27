/**直接throw首个参数。可用于处理promise */
export function throwF(arg: unknown): never {
  throw arg
}

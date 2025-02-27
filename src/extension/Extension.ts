/**插件信息 */
export class Extension {
  public constructor(
    public readonly name: string,
    public readonly desc: string,
    public readonly capabilities: ExtensionCapability[],
  ) {}
}

/**插件能力，抽象类。一个插件可有多个能力。
 *
 * 请参考派生类。
 */
export abstract class ExtensionCapability {}

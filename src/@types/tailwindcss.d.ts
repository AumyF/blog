/* eslint-disable @typescript-eslint/no-explicit-any */
type Plugin = unknown;
declare const createPlugin: TailwindPlugin.CreatePlugin;

export namespace TailwindPlugin {
  type Variants = string[];

  /**
   * The `addUtilities` function allows you to register new styles to be output
   * (along with the build-in utilities) at the `@tailwind utilities` directive.
   *
   * Plugin utilities are output in the order they are registered, _after_ built-in utilities,
   * so if a plugin targets any of the same propterties as a built-in utility,
   * the plugin utility will take precedence.
   *
   * To Add new utilities from a plugin, call `addUtilities`, passing in your styles using
   * [CSS-in-JS syntax](https://tailwindcss.com/docs/plugins/#css-in-js-syntax):
   *
   *  https://tailwindcss.com/docs/plugins/#adding-utilities
   */
  export type AddUtilities = (
    utils: object,
    options?: AddUtilitiesOptions
  ) => void;

  export type AddUtilitiesOptions =
    | {
        respectImportant?: false;
        respectPrefix?: boolean;
        variants?: Variants;
      }
    | Variants;

  // AddComponents
  export type AddComponents = (
    components: object,
    options?: AddComponentsOptions
  ) => void;

  export type AddComponentsOptions =
    | {
        respectPrefix?: boolean;
        variants?: Variants;
      }
    | Variants;

  // AddBase
  export type AddBase = (baseStyles: object) => void;

  // e
  export type Escape = (className: string) => string;

  // AddVariant
  export type AddVariant = (name: string, callBack: AddVariant.CallBack) => any;

  export namespace AddVariant {
    export type CallBack = (arg: {
      container: any;
      modifySelectors: ModifySelectors;
      separator: string;
    }) => void;

    export type ModifySelectors = (callBack: ModifySelectorsCallBack) => void;

    export type ModifySelectorsCallBack = (arg: {
      className: string;
    }) => string;
  }

  // Helpers
  export type Helpers = {
    addBase: AddBase;
    addComponents: AddComponents;
    addUtilities: AddUtilities;
    addVariant: AddVariant;
    config(configName: string): string;
    e: Escape;
    postcss: any;
    prefix(className: string): string;
    theme(name: string, options?: object): any;
    variants(str: string): Variants;
  };

  export type CreatePlugin = (plugin: (helpers: Helpers) => void) => Plugin;
}

export default createPlugin;

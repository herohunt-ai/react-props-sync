import * as vscode from "vscode";

const importSnippetString = 'import { ReactNode } from "react";\n';
const componentNameRegex = /export default (function )?(\w+)/;

export function activate(context: vscode.ExtensionContext) {
  function registerCommand(command: string, callback: (...args: any[]) => any) {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
  }

  registerCommand("simple-react-snippets.addProps", () => addProps(false));
  registerCommand("simple-react-snippets.addPropsWithChildren", () =>
    addProps(true)
  );
}

export function deactivate() {}

async function addProps(withChildren: boolean) {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  const entireText = editor.document.getText();

  const componentInfo = getComponentInfo(entireText);
  if (componentInfo === undefined) {
    vscode.window.showErrorMessage("Could not find component name");
    return;
  }

  // insert ReactNode import
  if (withChildren) {
    const importSnippet = new vscode.SnippetString(importSnippetString);
    await editor.insertSnippet(importSnippet, editor.document.positionAt(0));
  }

  // insert interface
  const { name: componentName, index: interfaceIndex } = componentInfo;
  const interfaceSnippet = getInterfaceSnippet(componentName, withChildren);
  const interfacePosition = withChildren
    ? editor.document.positionAt(interfaceIndex + importSnippetString.length)
    : editor.document.positionAt(interfaceIndex);
  await editor.insertSnippet(interfaceSnippet, interfacePosition);

}

function getComponentInfo(
  text: string
): { name: string; index: number } | undefined {
  // get component name
  const match = componentNameRegex.exec(text);
  const name = match?.[2];

  if (
    name === undefined ||
    name.length === 0 ||
    name[0] !== name[0].toUpperCase()
  ) {
    return;
  }

  // get component's first line
  const componentDefinitionIndex = Math.max(
    text.indexOf(`function ${name}(`),
    text.indexOf(`${name} = (`)
  );
  if (componentDefinitionIndex === -1) return;

  const lineStartIndex = text.lastIndexOf("\n", componentDefinitionIndex) + 1;

  return { name, index: lineStartIndex };
}

function getInterfaceSnippet(
  componentName: string,
  withChildren: boolean
): vscode.SnippetString {
  let lines = ["$0"];
  if (withChildren) lines.unshift("children: ReactNode;");

  lines = lines.map((line) => `  ${line}`);
  const linesString = `\n${lines.join("\n")}\n`;

  return new vscode.SnippetString(
    `interface ${componentName}Props {${linesString}}\n\n`
  );
}

import * as vscode from "vscode";

const importSnippetString = 'import { ReactNode } from "react";\n';

export async function addProps(withChildren: boolean) {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  let entireText = editor.document.getText();

  const componentName = getComponentName(entireText);
  if (componentName === undefined) {
    vscode.window.showErrorMessage("Could not find component name");
    return;
  }

  let componentIndex = getComponentIndex(entireText, componentName);
  if (componentIndex === undefined) {
    vscode.window.showErrorMessage("Could not find component location");
    return;
  }

  // insert ReactNode import
  if (withChildren) {
    const importSnippet = new vscode.SnippetString(importSnippetString);
    await editor.insertSnippet(importSnippet, editor.document.positionAt(0));
    componentIndex += importSnippet.value.length;
  }

  // insert props
  entireText = editor.document.getText();
  const propsIndex = getPropsIndex(entireText, componentIndex);
  const propsPosition = editor.document.positionAt(propsIndex);
  const propsSnippet = new vscode.SnippetString(`{ }: ${componentName}Props`);
  await editor.insertSnippet(propsSnippet, propsPosition);

  // insert interface
  const interfaceSnippet = getInterfaceSnippet(componentName, withChildren);
  const interfacePosition = editor.document.positionAt(componentIndex);
  await editor.insertSnippet(interfaceSnippet, interfacePosition);
  componentIndex += interfaceSnippet.value.length - 2;
}

const componentNameRegex = /export default (function )?(\w+)/;

export function getComponentIndex(
  text: string,
  name: string
): number | undefined {
  const componentIndex = Math.max(
    text.indexOf(`function ${name}(`),
    text.indexOf(`${name} = (`)
  );
  if (componentIndex === -1) return;
  return text.lastIndexOf("\n", componentIndex) + 1;
}

export function getInterfaceSnippet(
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

export function getPropsIndex(text: string, componentIndex: number): number {
  return text.indexOf("(", componentIndex) + 1;
}

export function getComponentName(text: string): string | undefined {
  const match = componentNameRegex.exec(text);
  const name = match?.[2];

  if (
    name === undefined ||
    name.length === 0 ||
    name[0] !== name[0].toUpperCase()
  ) {
    return;
  }
  return name;
}

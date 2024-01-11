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

  let timeout: NodeJS.Timeout;
  vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (event.contentChanges.length === 0) return;

    clearTimeout(timeout);
    timeout = setTimeout(() => syncProps(event), 500);
  });

  console.log("simple-react-snippets is now active!");
}

export function deactivate() {}

async function syncProps(event: vscode.TextDocumentChangeEvent) {
  const symbols: (vscode.DocumentSymbol & vscode.SymbolInformation)[] =
    await vscode.commands.executeCommand(
      "vscode.executeDocumentSymbolProvider",
      event.document.uri
    );

  const interfaceSymbol = symbols.find((s) => s.name.endsWith("Props"));
  if (interfaceSymbol === undefined) return;

  const cursorIndex = offset(event.contentChanges[0]?.range.start);
  const interfaceRange = interfaceSymbol.location.range;
  const isInsideProps =
    offset(interfaceRange.start) < cursorIndex &&
    cursorIndex < offset(interfaceRange.end);
  if (!isInsideProps) return;

  const interfaceProps = interfaceSymbol.children.map((s) => s.name);

  const entireText = event.document.getText();
  const componentName = getComponentName(entireText);
  const componentSymbol = symbols.find((s) => s.name === componentName);
  if (componentSymbol === undefined) return;

  const propsListStart =
    entireText.indexOf("{", offset(componentSymbol.selectionRange.end)) + 1;
  const propsListEnd = entireText.indexOf("}", propsListStart);
  const propsList = entireText
    .slice(propsListStart, propsListEnd)
    .split(",")
    .map((s) => s.trim());

  let hasTrailingComma = propsList.at(-1) === "";
  if (hasTrailingComma) propsList.pop();

  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;

  const propsToAdd = interfaceProps.filter((prop) => !propsList.includes(prop));

  const propsToRemove = propsList.filter(
    (prop) => !interfaceProps.includes(prop)
  );

  if (propsToAdd.length === 0 && propsToRemove.length === 0) return;

  const insertions = propsToAdd.map((prop) => {
    const insertPosition = event.document.positionAt(propsListEnd);
    const insertSnippet = `${hasTrailingComma ? "" : ","}${prop}, `;
    hasTrailingComma = true;
    return new vscode.TextEdit(
      new vscode.Range(insertPosition, insertPosition),
      insertSnippet
    );
  });

  const deletions = propsToRemove.map((prop) => {
    const propStart = entireText.indexOf(prop, propsListStart);
    const propEnd = Math.min(
      entireText.indexOf(",", propStart) + 1,
      entireText.indexOf("}", propStart)
    );
    return new vscode.Range(
      event.document.positionAt(propStart),
      event.document.positionAt(propEnd)
    );
  });

  await editor.edit((editBuilder) => {
    for (const insertion of insertions) {
      editBuilder.insert(insertion.range.start, insertion.newText);
    }
    for (const deletion of deletions) {
      editBuilder.delete(deletion);
    }
  });

  const newEntireText = event.document.getText();
  const newPropsListEnd = newEntireText.indexOf("}", propsListStart);
  const propsRange = new vscode.Range(
    event.document.positionAt(propsListStart - 1),
    event.document.positionAt(newPropsListEnd + 1)
  );

  const formattingEdits: vscode.TextEdit[] =
    await vscode.commands.executeCommand(
      "vscode.executeFormatRangeProvider",
      event.document.uri,
      propsRange
    );

  await editor.edit((editBuilder) => {
    for (const edit of formattingEdits) {
      editBuilder.replace(edit.range, edit.newText);
    }
  });

  function offset(position: vscode.Position) {
    return event.document.offsetAt(position);
  }
}

async function addProps(withChildren: boolean) {
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

function getComponentName(text: string): string | undefined {
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

function getComponentIndex(text: string, name: string): number | undefined {
  const componentIndex = Math.max(
    text.indexOf(`function ${name}(`),
    text.indexOf(`${name} = (`)
  );
  if (componentIndex === -1) return;
  return text.lastIndexOf("\n", componentIndex) + 1;
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

function getPropsIndex(text: string, componentIndex: number): number {
  return text.indexOf("(", componentIndex) + 1;
}

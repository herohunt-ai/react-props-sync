import * as vscode from "vscode";
import { addProps } from "./addProps";
import { getComponentName } from "./utils";

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
    let propStart = entireText.indexOf(prop, propsListStart);

    const lastNewLineIndex = entireText.lastIndexOf("\n", propStart);
    const lastCommaIndex = entireText.lastIndexOf(",", propStart);
    if (lastNewLineIndex > lastCommaIndex) propStart = lastNewLineIndex;

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

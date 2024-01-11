import * as vscode from "vscode";

export async function syncProps(event: vscode.TextDocumentChangeEvent) {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;

  const entireText = event.document.getText();

  const propsLists = await getPropsLists();
  if (propsLists === undefined) return;
  const { interfaceProps, propsList, propsListStart, propsListEnd } =
    propsLists;

  let hasTrailingComma = propsList.at(-1) === "";
  if (hasTrailingComma) propsList.pop();

  const propsToAdd = interfaceProps.filter((prop) => !propsList.includes(prop));
  const propsToRemove = propsList.filter(
    (prop) => !interfaceProps.includes(prop)
  );
  if (propsToAdd.length === 0 && propsToRemove.length === 0) return;

  await updateProps();
  await formatProps();
  return;

  async function getPropsLists() {
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

    const componentName = interfaceSymbol.name.replace("Props", "");
    const componentSymbol = symbols.find((s) => s.name === componentName);
    if (componentSymbol === undefined) return;

    const propsListStart =
      entireText.indexOf("{", offset(componentSymbol.selectionRange.end)) + 1;
    const propsListEnd = entireText.indexOf("}", propsListStart);
    const propsList = entireText
      .slice(propsListStart, propsListEnd)
      .split(",")
      .map((s) => s.trim());

    return { interfaceProps, propsList, propsListStart, propsListEnd };

    function offset(position: vscode.Position) {
      return event.document.offsetAt(position);
    }
  }

  async function updateProps() {
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

    await editor!.edit((editBuilder) => {
      for (const insertion of insertions) {
        editBuilder.insert(insertion.range.start, insertion.newText);
      }
      for (const deletion of deletions) {
        editBuilder.delete(deletion);
      }
    });
  }

  async function formatProps() {
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

    await editor!.edit((editBuilder) => {
      for (const edit of formattingEdits) {
        editBuilder.replace(edit.range, edit.newText);
      }
    });
  }
}

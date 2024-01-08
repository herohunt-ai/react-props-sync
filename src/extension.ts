import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "simple-react-snippets.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World");
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

# React Props Sync & Snippets for VS Code

Make your TypeScript React development easier by creating new components with straightforward snippets, adding props with a command and syncing the props interface with the component's parameter list.

#### Example of adding and synchronizing props

![Demo of adding and synchronizing props](https://github.com/herohunt-ai/react-props-sync/raw/main/assets/demo.gif)

## Features

- Create new React function components with snippets
- Add props to an existing component – with or without the `children` field
- Sync the props interface with the component's parameter list

## Documentation

### Snippets

#### `rfc` – React Function Component

```tsx
function Example() {
  return (
    |
  );
}

export default Example;
```

#### `rfcp` – React Function Component with Props

```tsx
interface ExampleProps {
  ${1:children}: ${2:ReactNode};
}

function Example({ $1 }: ExampleProps) {
  return (
    |
  );
}

export default Example;
```

#### `rfcf` – React Function Component with `forwardRef`

```tsx
import { ForwardedRef, forwardRef } from "react";

function Example(
  _props: Record<string, never>,
  ref: ForwardedRef<$1>,
) {
  return (
    |
  );
}

export default forwardRef(Example);
```

#### `rfcpf` – React Function Component with props, with `forwardRef`

```tsx
import { ForwardedRef, forwardRef } from "react";

interface ExampleProps {
  ${2:children}: ${3:ReactNode};
}

function Example(
  { $2 }: ExampleProps,
  ref: ForwardedRef<$1>,
) {
  return (
    |
  );
}

export default forwardRef(Example);
```

### Commands

#### Add props

```diff
+interface ExampleProps {
+  |
+}

-function Example() {
+function Example({ }: ExampleProps) {
   return <h1>Example</h1>;
 }

 export default Example;
```

#### Add props with children

```diff
+interface ExampleProps {
+  children: ReactNode;
+  |
+}

-function Example() {
+function Example({ children }: ExampleProps) {
   return <h1>Example</h1>;
 }

 export default Example;
```

### Syncing props

When a change is detected in the props interface in the active editor, the extension does the following:

- Finds the list of fields of the props interface
- Finds the list of props in the component function's parameters
- Adds the props that exist in the interface but do not exist in the function
- Removes the props that exist in the function but do not exist in the interface
- As this might break the formatting of the code, it formats the list of parameters using the default formatter

This lets you add and remove props without repeating the same action in two places in the code.

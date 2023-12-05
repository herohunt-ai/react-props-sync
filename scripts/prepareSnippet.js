const text = `
import { ForwardedRef, forwardRef } from "react";

interface ExampleProps {
  |
}

function Example(
  { | }: ExampleProps,
  ref: ForwardedRef<|>,
) {
  return (
    |
  );
}

export default forwardRef(Example);
`;

const textEscaped = text.replaceAll("\t", "\\t").replaceAll('"', '\\"');

const lines = textEscaped.split("\n");
lines.shift(); // remove first empty line
lines.pop(); // remove last empty line

const result = lines.map((line) => `"${line}",`).join("\n");

console.log(result);

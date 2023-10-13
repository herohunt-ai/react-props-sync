const text = `
interface ExampleProps {
  |
}

function Example({ | }: ExampleProps) {
  return (
    |
  )
}

export default Example;
`;

const textEscaped = text.replaceAll("\t", "\\t");

const lines = textEscaped.split("\n");
lines.shift(); // remove first empty line
lines.pop(); // remove last empty line

const result = lines.map((line) => `"${line}",`).join("\n");

console.log(result);

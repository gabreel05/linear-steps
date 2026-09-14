import katex from 'katex';
import 'katex/dist/katex.min.css';

/** Only generated TeX from validated solver values reaches this component. */
export function Math({ tex, block = false }: { tex: string; block?: boolean }) {
  return (
    <span
      className={block ? 'math-block' : 'math-inline'}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, {
          displayMode: block,
          throwOnError: false,
          trust: false,
          output: 'htmlAndMathml',
        }),
      }}
    />
  );
}

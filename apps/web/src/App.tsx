const modules = [
  {
    number: '01',
    title: 'Sistemas lineares',
    description: 'Acompanhe o escalonamento e entenda cada operação de linha.',
    label: 'Primeiro módulo em desenvolvimento',
  },
  {
    number: '02',
    title: 'Matrizes',
    description:
      'Explore operações, determinantes e inversas por diferentes métodos.',
    label: 'Planejado para a V1',
  },
  {
    number: '03',
    title: 'Vetores e espaços',
    description: 'Estude produtos, projeções, combinações lineares e bases.',
    label: 'Planejado para a V1',
  },
];

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main">
          <span aria-hidden="true">[ L ]</span> Linear Steps
        </a>
        <span className="status">
          <span aria-hidden="true" /> Em desenvolvimento
        </span>
      </header>
      <main id="main">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">ÁLGEBRA LINEAR · PASSO A PASSO</p>
          <h1 id="page-title">
            Entenda o caminho.
            <br />
            <span>Encontre a solução.</span>
          </h1>
          <p className="lead">
            Um espaço para estudar álgebra linear com métodos à sua escolha e
            cada transformação à vista.
          </p>
          <p className="notice">
            Estamos construindo a primeira versão. Os cálculos ainda não estão
            disponíveis.
          </p>
        </section>
        <section className="module-section" aria-labelledby="modules-title">
          <div className="section-heading">
            <h2 id="modules-title">O que vamos explorar</h2>
            <span>Três áreas, uma etapa de cada vez.</span>
          </div>
          <div className="modules">
            {modules.map((module) => (
              <article className="module" key={module.number}>
                <span className="module-number">{module.number}</span>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <span className="module-label">{module.label}</span>
              </article>
            ))}
          </div>
        </section>
        <aside className="principle">
          <span aria-hidden="true">↳</span>
          <p>
            Mais do que chegar ao resultado:
            <br />
            <strong>acompanhar como ele foi construído.</strong>
          </p>
        </aside>
      </main>
      <footer>
        Linear Steps <span>Feito para aprender.</span>
      </footer>
    </div>
  );
}

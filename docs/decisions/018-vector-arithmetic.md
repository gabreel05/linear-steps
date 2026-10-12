# 018 — Aritmética de vetores e saídas irracionais

O núcleo oferece soma, subtração, multiplicação por escalar, deslocamento entre pontos (final menos inicial), produto escalar, norma, normalização, ângulo e projeção em dimensão 1 a 6. Entradas continuam limitadas a inteiros, frações e decimais. Os algoritmos compostos operam diretamente com Rational, sem converter resultados intermediários de volta em texto de entrada.

O contrato vector-arithmetic-1 usa method=components. Operações por componente registram operandos, operador e valor; produtos escalares registram produtos e somas parciais. A projeção inclui fator, componentes projetadas, resíduo, produto do resíduo pela direção e distância à reta pela origem. Índices são de base zero. Todos os resultados são imutáveis e seguros para JSON.

ExactReal representa racional, raiz quadrada de racional ou racional dividido por raiz quadrada. Quadrados perfeitos são reconhecidos por raiz inteira com BigInt; outras raízes permanecem exatas sem fatoração simbólica. Normalizações preservam o sinal do numerador. Essas expressões são apenas saídas, não uma ampliação do parser.

Ângulos registram arccos do quociente exato e uma aproximação separada em graus. Para a aproximação, atan2 usa seno e cosseno derivados de razões quadráticas limitadas a [0,1], convertidas com 32 casas decimais. Isso evita Infinity/Infinity e cancelamento na conversão de vetores quase paralelos. A aproximação não participa das decisões exatas e deve ser apresentada com ≈ pela interface.

A norma zero e a ortogonalidade com vetor zero são válidas. Normalização e ângulo retornam status undefined com motivo zero-vector; projeção sobre direção zero retorna zero-direction. Esses resultados não possuem vetor normalizado, ângulo ou projeção fictícios. Dimensões incompatíveis e entradas inválidas produzem MathInputError.

Os testes executam VET-05, VET-07 e VET-14 e verificam identidades em todas as dimensões, normalização, decomposição ortogonal, idempotência da projeção, sinais, limites, raízes e serialização. Interface, formatação matemática dessas expressões e histórico serão entregues em um PR posterior; não há migração de banco nesta entrega.

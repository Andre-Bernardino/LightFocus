# LightFocus para testes no Android

## Objetivo
Deixar o LightFocus pronto para ser aberto e instalado pelo navegador em celulares Android, sem criar APK e sem adicionar funcionamento offline.

## O que será feito
- Criar a configuração de aplicativo instalável com o nome, as cores e a abertura em tela independente.
- Criar ícones adequados para a tela inicial do Android usando a identidade visual existente.
- Conectar essa configuração ao aplicativo sem alterar as tarefas, a assistente ou os lembretes.
- Conferir a experiência em tamanho de celular e validar que o projeto continua funcionando.

## Detalhes técnicos
- Usar instalação pelo navegador com manifesto web, sem service worker e sem cache offline.
- Adicionar ícones de 192 e 512 pixels, incluindo opção adaptável para Android.
- Incluir cor do tema e referências do manifesto no cabeçalho global.
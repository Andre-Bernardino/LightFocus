# Assistente diária do LightFocus

## Objetivo
Transformar a IA em uma presença constante no LightFocus, capaz de conversar, ajudar a organizar o dia, lembrar atividades e dividir tarefas grandes em passos pequenos.

## O que será feito
- Manter a conversa com a Assistente LightFocus sempre acessível pelo aplicativo, sem cobrir ou substituir a lista de tarefas.
- Dar à conversa contexto das tarefas abertas para oferecer ajuda prática no dia a dia.
- Permitir que a assistente sugira horários de lembrete adequados e salve esses lembretes após confirmação da pessoa.
- Melhorar os lembretes para indicar qual tarefa ou atividade precisa de atenção, em vez de mostrar apenas um aviso genérico.
- Manter “Decompor com IA” tanto ao criar uma tarefa quanto em tarefas já existentes, exibindo os micro-passos gerados.
- Mostrar mensagens claras quando a IA ou as notificações não estiverem disponíveis, sem perder a tarefa digitada.

## Detalhes técnicos
- Reutilizar a integração atual com Lovable AI e o modelo já configurado.
- Preservar a conversa única e temporária, conforme definido anteriormente.
- Armazenar as preferências e os lembretes no navegador, como as tarefas atuais, sem criar contas ou histórico de conversa novo.
- Validar a chamada real da IA, os lembretes, a decomposição e a visualização em tela grande e celular.

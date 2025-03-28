# Frontend do Kids Book Creator

## Configuração Inicial

1. Instale as dependências:
   ```
   npm install
   ```

2. Inicie o aplicativo:
   ```
   npm start
   ```

3. Para executar no iOS:
   ```
   npm run ios
   ```

4. Para executar no Android:
   ```
   npm run android
   ```

## Credenciais de Teste

Para testar o aplicativo, você pode usar as seguintes credenciais:

- **Email**: crtnet@hotmail.com
- **Senha**: senha123

Certifique-se de que o backend esteja em execução e que o usuário de teste tenha sido criado usando o comando `npm run create:testuser` no diretório do backend.

## Estrutura do Projeto

- `src/components`: Componentes reutilizáveis
- `src/contexts`: Contextos da aplicação (AuthContext, etc.)
- `src/screens`: Telas da aplicação
- `src/services`: Serviços (API, Socket, etc.)
- `src/config`: Configurações da aplicação
- `src/utils`: Utilitários
- `src/navigation`: Configuração de navegação

## Configuração de Conexão

O aplicativo tentará se conectar ao backend usando as seguintes URLs, em ordem:

1. http://localhost:3000
2. http://192.168.1.x:3000 (seu IP local)
3. http://10.0.2.2:3000 (para emulador Android)

Se você estiver tendo problemas de conexão, verifique se:

1. O backend está em execução na porta 3000
2. O dispositivo/emulador pode acessar o servidor backend
3. As configurações de firewall não estão bloqueando a conexão
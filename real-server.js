import app from './main';

app.use(app.middleware.parseJSON);

app.post(
    '/',
    async (context) => {
        const {body, query} = context;
        context.sendJSON({body, query, raw: await context.getPostData()});
    }
);

app.post(
    '/test',
    async (context) => {
        const {body} = context;
        context.sendJSON(body.value ** 3);
    }
);

app.get(
    '/lol',
    async (context) => {
        const value = parseFloat(context.query.value);
        context.sendJSON(value ** 2);
    }
);

app.start();

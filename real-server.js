import app from './main';

app.use(app.middleware.parseJSON);

app.post(
    '/',
    async (context) => {
        const {body, query} = context;
        context.sendJSON({body, query, raw: await context.getPostData()});
    }
);

app.start();

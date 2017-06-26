import url from 'url';
import http from 'http';

import fs from 'mz/fs';
import yaml from 'js-yaml';

// const fs = require('mz/fs');
// const http = require('http');

const fileResponse = async (fileName, response, fileType = null) => {
    const fileContent = await fs.readFile(fileName);
    fileType = fileType || "text/plain";

    response.setHeader("Content-Type", fileType);
    response.setHeader("Content-Length", fileContent.length);

    response.writeHead(200);
    return new Promise(
        resolve => response.end(fileContent, resolve)
    );
};

const Context = (request, response) => {
    let finished = false;

    const urlInfo = url.parse(request.url, true);
    let rawPostData = null;

    const sendReponse = async ({code, content, headers = {}}) => {
        return new Promise(
            resolve => {
                for (const header of Object.keys(headers)) {
                    response.setHeader(header, headers[header]);
                }
                response.writeHead(code);
                response.end(content, resolve);
            }
        );
    };

    return {
        request,
        response,
        get method() {
            return request.method.toLowerCase();
        },
        get finished() {
            return finished || response.finished;
        },
        async sendFile(fileName, fileType = null) {
            await fileResponse(fileName, response, fileType);
        },
        get path() {
            return urlInfo.pathname;
        },
        async getPostData() {
            if (rawPostData === null) {
                rawPostData = Buffer.from("");
                await new Promise(
                    resolve => {
                        request.on('data', data => rawPostData = Buffer.concat([rawPostData, data]));
                        request.on('end', () => resolve());
                    }
                );
            }
            return rawPostData;
        },
        sendReponse,
        sendJSON (data, headers = {}) {
            return sendReponse({
                code: 200,
                headers: {
                    ...headers,
                    'content-type': 'application/json'
                },
                content: JSON.stringify(data)
            });
        },
        query: urlInfo.query
    };
};

const middlewares = {};

middlewares.parseJSON = async (context) => {
    const {request} = context;

    const contentType = request.headers["content-type"] || "";
    if (contentType.indexOf("json") !== -1) {
        context.body = JSON.parse(
            (await context.getPostData()).toString()
        );
    }
};

const middleWare = [];

const routes = [];
const addRoute = (method, urlTest, handle) => {
    routes.push({
        test: (mthd, url) => method === mthd && urlTest(url) === true,
        handle
    });
};

const server = http.createServer(
    async (request, response) => {
        const context = Context(request, response);
        for (const mw of middleWare) {
            await mw(context);
            if (context.finished === true) {
                break;
            }
        }
        if (context.finished === true) {
            return;
        }

        for (const route of routes) {
            if (route.test(context.method, context.path) === true) {
                route.handle(context);
                return;
            }
        }
        context.sendReponse({
            code: 404,
            headers: {
                'content-type': 'text/plain'
            },
            content: "Nope, nothing here"
        });
    }
);

const app = {
    get(route, handle) {
        let test = null;
        if (/^\/(\w[\w\/]*)?$/.test(route) === true) {
            test = url => url === route;
        }
        addRoute('get', test, handle);
    },
    post(route, handle) {
        let test = null;
        if (/^\/(\w[\w\/]*)?$/.test(route) === true) {
            test = url => url === route;
        }
        addRoute('post', test, handle);
    },
    use(mw) {
        middleWare.push(mw);
    },
    middleware: middlewares,
    async start() {
        const config = yaml.safeLoad(
            await fs.readFile("axel-wiki-config.yaml")
        );

        const port = config.port || 80;

        server.listen(port, () => console.log(`listening on port ${port}`));
    }
};

export default app;

// server.listen(8000, () => console.log("listening"));

## Node Service

This app listens on port `3000` (443 when accessing from outside glitch) and
exposes a single endpoint at `/` that responds with the string `hello from
node`. For every request it receives, it calls the Java service at
`https://signalfx-otel-workshop-java.glitch.me` and appends the response from
the Node service it's own response.

The following modifications can be made:

* The listen port can be modified by editing `.env`
* The call host and port can be modified by editing `.env`

This modifications make it possible to run this workshop in other environments.
For example, to run locally in Docker, the following changes could be made:

* In `.env` set the listen port to `3002`
* In `.env` set the call host to `https://host.docker.internal:3003`

## Running the app

You'll need NodeJS, Yarn and Make to be able to run the service.

- Run `make install` to install all dependencies.
- Run `make run` and then go to https://signalfx-otel-workshop-node.glitch.me
  to access the app.

## Instrumenting Python HTTP server and client with OpenTelemetry

### 1. Install OpenTelemetry packages

```bash
yarn add @opentelemetry/api @opentelemetry/node \
    @opentelemetry/tracing @opentelemetry/exporter-collector
```

### 2. Configure the tracer in a new tracer.js file

`tracer.js`

```js
'use strict';

const opentelemetry = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { CollectorExporter } = require('@opentelemetry/exporter-collector');

const EXPORTER = process.env.EXPORTER || '';


module.exports = (serviceName) => {
  const provider = new NodeTracerProvider()
  const exporter = new CollectorExporter({serviceName});
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
  provider.register();

  return opentelemetry.trace.getTracer('node-example');
};
```

### 3. Import the tracer from tracer.js

`index.js`

```diff
'use strict';

+// import tracer before importing express and axios
+const tracer = require('./tracer')('node-service');
+
const express = require('express');
const axios = require('axios').default;

const app = express();
```

#### 4. Wrap the fetch operation in a custom span

```diff
app.use(express.json());

app.get('/', async (req, res) => {
+  const span = tracer.startSpan('fetch-from-java')
+  tracer.withSpan(span, () => {
+    axios.get(process.env.JAVA_REQUEST_ENDPOINT)
+    .then(response => {
+      res.status(201).send("hello from node\n" + response)
+      span.end()
+    })
+    .catch(err => {
+      res.status(201).send("hello from node\n" + "error fetching from java")
+      span.end()
+    })
+  })
-  axios.get(process.env.JAVA_REQUEST_ENDPOINT)
-  .then(response => {
-    res.status(201).send("hello from node\n" + response)
-  })
-  .catch(err => {
-    res.status(201).send("hello from node\n" + "error fetching from java")
-  })
});

app.listen(process.env.SERVER_PORT);
```

Outgoing HTTP requests and incoming requests handled by express will be traced
automatically by our tracer. In addition to that we are also generating a
custom span and wrapping the outgoing request span with it.

We can run the app again and this time it should emit spans to a locally running
OpenTelemetry Collector.

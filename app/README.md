## Python Service

This app listens on port `8081` and exposes a single endpoint at `/` that resposds with the string `hello from node`. For every request it receives, it calls the Java service at `http://localhost:8083/` and appends the response from the Python service it's own response.

## Running the app

You'll need NodeJS, Yarn and Make to be able to run the service. 

- Run `make install` to install all dependencies.
- Run `make run` and then go to http://localhost:8081 to access the app.

## Instrumenting Python HTTP server and client with OpenTelemetry

### 1. Install OpenTelemetry packages

```bash
yarn add @opentelemetry/api @opentelemetry/node @opentelemetry/tracing @opentelemetry/exporter-collector
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
const PORT = 8081;
```

#### 4. Wrap the fetch operation in a custom span

```diff
app.use(express.json());

app.get('/', async (req, res) => {
+  const span = tracer.startSpan('fetch-from-java')
+  tracer.withSpan(span, () => {
+    axios.get('http://localhost:8083')
+    .then(response => {
+      res.status(201).send("hello from node\n" + response)
+      span.end()
+    })
+    .catch(err => {
+      res.status(201).send("hello from node\n" + "error fetching from java")
+      span.end()
+    })
+  })
-  axios.get('http://localhost:8083')
-  .then(response => {
-    res.status(201).send("hello from node\n" + response)
-  })
-  .catch(err => {
-    res.status(201).send("hello from node\n" + "error fetching from java")
-  })
});

app.listen(PORT);
```

Outgoing HTTP requests and incoming requests handled by express will be traced automatically by our tracer. In addition to that we are also generating a custom span and wrapping the outgoing request span with it.

We can run the app again and this time it should emit spans to locally running OpenTelemetry collector.
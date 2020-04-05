## Node Service

This app listens on port `3000` (443 when accessing from outside glitch) and
exposes a single endpoint at `/` that responds with the string `hello from
node`. For every request it receives, it should call the Java service at
`https://signalfx-otel-workshop-java.glitch.me`.

The following modifications can be made:

* The `SERVER_PORT` can be modified by editing `.env`
* The call destination can be modified by setting  `JAVA_REQUEST_ENDPOINT` in `.env`

The `.env` file can be used to allow this workshop to be run
in other environments. For example, to run locally, the following changes could
be made:

* In `.env` set the listen port to `3002`
* In `.env` set the `JAVA_REQUEST_ENDPOINT` to `http://localhost:3003`

To run in Docker, set `JAVA_REQUEST_ENDPOINT` to `http://host.docker.internal:3003`

## Running the app

The application is available at
https://glitch.com/edit/#!/signalfx-otel-workshop-node. By default, it runs
an uninstrumented version of the application. From the Glitch site, you
should select the name of the Glitch project (top left) and select `Remix
Project`. You will now have a new Glitch project. The name of the project is
listed in the top left of the window.

To run this workshop locally, you'll need NodeJS, Yarn and Make to be able to run
the service. Install the prerequisites by running `make install`. Next, run
`make run` and then go to http://localhost:3000 to access the app.

## Instrumenting Node HTTP server and client with OpenTelemetry

Your task is to instrument this application using [OpenTelemetry
JavaScript](https://github.com/open-telemetry/opentelemetry-js). If you get
stuck, check out the `app_instrumented` directory.

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
//const { CollectorExporter } = require('@opentelemetry/exporter-collector');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');

const EXPORTER = process.env.EXPORTER || '';


module.exports = (serviceName) => {
  const provider = new NodeTracerProvider()
  //const exporter = new CollectorExporter({
  //  url: process.env.SPAN_EXPORTER_PROTOCOL + '://' + process.env.SPAN_EXPORTER_HOST + ':' + process.env.SPAN_EXPORTER_PORT + '/' + process.env.SPAN_EXPORTER_ENDPOINT,
  //  serviceName: 'node-service'
  //});
  const exporter = new ZipkinExporter({
    url: process.env.SPAN_EXPORTER_PROTOCOL + '://' + process.env.SPAN_EXPORTER_HOST + ':' + process.env.SPAN_EXPORTER_PORT,
    serviceName: 'node-service'
  });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
  provider.register();

  return opentelemetry.trace.getTracer('node-example');
};
```

Note: The recommended deployment model for OpenTelemetry is to have
applications export in OpenTelemetry (OTLP) format to the OpenTelemetry
Collector and have the OpenTelemetry Collector send to your back-end(s) of
choice. OTLP uses gRPC and unfortunately it does not appear Glitch supports
gRPC. In addition, the OpenTelemetry JavaScript instrumentation only supports
OpenCensus format (this should be updated shortly). As a result, this workshop
emits in Zipkin format.

Note: You will notice multiple environment variables used above. These
variables should be set in a `.env` file in the same directory as `tracer.js`.

```bash
SPAN_EXPORTER_HOST=signalfx-otel-workshop-collector.glitch.me
SPAN_EXPORTER_PORT=443
SPAN_EXPORTER_ENDPOINT=/api/v2/spans
SPAN_EXPORTER_PROTOCOL=https
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

Note: You will notice multiple environment variables used above. These
variables should be set in a `.env` file in the same directory as `tracer.js`.

```bash
JAVA_REQUEST_ENDPOINT=signalfx-otel-workshop-java.glitch.me
SERVER_PORT=3000
```

Outgoing HTTP requests and incoming requests handled by express will be traced
automatically by our tracer. In addition to that we are also generating a
custom span and wrapping the outgoing request span with it.

We can run the app again and this time it should emit spans to a locally running
OpenTelemetry Collector.

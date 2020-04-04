'use strict';

const opentelemetry = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { SimpleSpanProcessor } = require('@opentelemetry/tracing');
// const { CollectorExporter } = require('@opentelemetry/exporter-collector');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');

const EXPORTER = process.env.EXPORTER || '';


module.exports = (serviceName) => {
  const provider = new NodeTracerProvider()
  // const exporter = new CollectorExporter({serviceName});
  const exporter = new ZipkinExporter({
    url: 'http://localhost:9411',
    serviceName: 'node-service'
  });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
  provider.register();

  return opentelemetry.trace.getTracer('express-example');
};

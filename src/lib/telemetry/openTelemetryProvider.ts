export default {};
// import { SpanKind } from "@opentelemetry/api";
// import { Resource } from "@opentelemetry/resources";
// import type { HttpsProxyAgent } from "https-proxy-agent";
// // import { diag, DiagConsoleLogger } from '@opentelemetry/api';
// import type { TelemetryContext, TelemetryProvider } from "./telemetry";
// // import { DiagLogLevel } from '@opentelemetry/api/build/src/diag/types';
// import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
// import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
// import type { AttributeValue, Span, TimeInput, Tracer } from "@opentelemetry/api";
// import { BasicTracerProvider, BatchSpanProcessor, /* ConsoleSpanExporter, */ SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
//
//
// export class OpenTelemetryProvider implements TelemetryProvider
// {
// 	private _globalAttributes: Record<string, AttributeValue> = {};
//
// 	private readonly provider: BasicTracerProvider;
// 	private readonly tracer: Tracer;
//
// 	constructor(context: TelemetryContext, agent?: HttpsProxyAgent, debugging?: boolean)
// 	{
// 		this.provider = new BasicTracerProvider(
// 		{
// 			resource: new Resource(
// 			{
// 				[SemanticResourceAttributes.SERVICE_NAME]: "taskexplorer",
// 				[SemanticResourceAttributes.SERVICE_VERSION]: context.extensionVersion,
// 				[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: context.env,
// 				[SemanticResourceAttributes.DEVICE_ID]: context.machineId,
// 				[SemanticResourceAttributes.OS_TYPE]: context.platform,
// 				"extension.id": context.extensionId,
// 				"session.id": context.sessionId,
// 				"language": context.language,
// 				"vscode.edition": context.vscodeEdition,
// 				"vscode.version": context.vscodeVersion,
// 				"vscode.host": context.vscodeHost,
// 				"vscode.remoteName": context.vscodeRemoteName,
// 				"vscode.shell": context.vscodeShell,
// 				"vscode.uiKind": context.vscodeUIKind,
// 			}) as any,
// 		});
//
// 		// if (debugging) {
// 		// 	diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.VERBOSE);
// 		// 	this.provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
// 		// }
//
// 		const exporter = new OTLPTraceExporter(
// 		{
// 			url: debugging ? "https://otel-dev.gitkraken.com:4318/v1/traces" : "https://otel.gitkraken.com:4318/v1/traces",
// 			compression: "gzip" as any,
// 			httpAgentOptions: agent?.options,
// 		});
//
// 		this.provider.addSpanProcessor(
// 			debugging ? new SimpleSpanProcessor(exporter) : new BatchSpanProcessor(exporter),
// 		);
//
// 		this.tracer = this.provider.getTracer(context.extensionId);
// 	}
//
//
// 	dispose()
// 	{
// 		void this.provider.shutdown();
// 	}
//
//
// 	sendEvent(name: string, data?: Record<string, AttributeValue>, startTime?: TimeInput, endTime?: TimeInput)
// 	{
// 		const span = this.tracer.startSpan(name,
// 		{
// 			attributes: this._globalAttributes,
// 			kind: SpanKind.INTERNAL,
// 			startTime: startTime ?? Date.now(),
// 		});
// 		if (data) {
// 			span.setAttributes(data);
// 		}
// 		span.end(endTime);
// 	}
//
//
// 	startEvent(name: string, data?: Record<string, AttributeValue>, startTime?: TimeInput)
// 	{
// 		const span = this.tracer.startSpan(name,
// 		{
// 			attributes: this._globalAttributes,
// 			kind: SpanKind.INTERNAL,
// 			startTime: startTime ?? Date.now(),
// 		});
// 		if (data) {
// 			span.setAttributes(data);
// 		}
// 		return span;
// 	}
//
// 	// sendErrorEvent(
// 	// 	name: string,
// 	// 	data?: Record<string, string>,
// 	// ): void {
// 	// }
//
// 	// sendException(
// 	// 	error: Error | unknown,
// 	// 	data?: Record<string, string>,
// 	// ): void {
// 	// }
//
// 	setGlobalAttributes(attributes: Map<string, AttributeValue>)
// 	{
// 		this._globalAttributes = Object.fromEntries(attributes);
// 	}
// }

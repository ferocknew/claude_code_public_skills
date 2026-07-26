/**
 * draw.io 内置形状样式库
 */

const SHAPES = {
  // 基础形状
  rect: "rounded=0;whiteSpace=wrap;html=1;",
  roundedRect: "rounded=1;whiteSpace=wrap;html=1;",
  circle: "ellipse;whiteSpace=wrap;html=1;",
  diamond: "rhombus;whiteSpace=wrap;html=1;",
  triangle: "triangle;whiteSpace=wrap;html=1;",
  hexagon: "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;",
  cylinder: "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;",
  cloud: "ellipse;shape=cloud;whiteSpace=wrap;html=1;",
  parallelogram: "shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;",
  trapezoid: "shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;html=1;",
  callout: "shape=callout;whiteSpace=wrap;html=1;perimeter=calloutPerimeter;",

  // 流程图
  process: "rounded=0;whiteSpace=wrap;html=1;",
  decision: "rhombus;whiteSpace=wrap;html=1;",
  startEnd: "rounded=1;whiteSpace=wrap;html=1;arcSize=50;",
  io: "shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;",
  predefined: "shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;",
  manual: "shape=manualInput;whiteSpace=wrap;html=1;",
  preparation: "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;",
  delay: "shape=delay;whiteSpace=wrap;html=1;",
  display: "shape=display;whiteSpace=wrap;html=1;",
  document: "shape=document;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;",
  manualOp: "shape=manualOperation;whiteSpace=wrap;html=1;",

  // UML
  class: "swimlane;fontStyle=1;align=center;startSize=26;",
  interface: "swimlane;fontStyle=3;align=center;startSize=26;",
  package: "shape=folder;fontStyle=1;tabWidth=70;tabHeight=30;tabPosition=left;whiteSpace=wrap;html=1;",
  actor: "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;",

  // ERD
  entity: "shape=table;startSize=30;container=1;collapsible=1;childLayout=tableLayout;fontStyle=1;align=center;resizeLast=1;",
  erAttribute: "shape=partialRectangle;whiteSpace=wrap;html=1;top=0;left=0;bottom=0;fillColor=none;overflow=hidden;fontSize=12;",

  // 网络
  server: "shape=mxgraph.cisco.servers.standard_server;whiteSpace=wrap;html=1;",
  firewall: "shape=mxgraph.cisco.firewalls.firewall;whiteSpace=wrap;html=1;",
  router: "shape=mxgraph.cisco.routers.router;whiteSpace=wrap;html=1;",
  switch_: "shape=mxgraph.cisco.switches.workgroup_switch;whiteSpace=wrap;html=1;",
  cloudNet: "ellipse;shape=cloud;whiteSpace=wrap;html=1;fillColor=#f5f5f5;fontColor=#333333;strokeColor=#666666;",

  // AWS
  ec2: "shape=mxgraph.aws4.ec2;whiteSpace=wrap;html=1;",
  s3: "shape=mxgraph.aws4.s3;whiteSpace=wrap;html=1;",
  rds: "shape=mxgraph.aws4.rds;whiteSpace=wrap;html=1;",
  lambda: "shape=mxgraph.aws4.lambda;whiteSpace=wrap;html=1;",
  sqs: "shape=mxgraph.aws4.sqs;whiteSpace=wrap;html=1;",
  vpc: "shape=mxgraph.aws4.vpc;whiteSpace=wrap;html=1;",

  // 容器/K8s
  pod: "shape=mxgraph.k8s.pods;whiteSpace=wrap;html=1;",
  service: "shape=mxgraph.k8s.services;whiteSpace=wrap;html=1;",
  ingress: "shape=mxgraph.k8s.ingress;whiteSpace=wrap;html=1;",
  deployment: "shape=mxgraph.k8s.deployments;whiteSpace=wrap;html=1;",

  // 图标
  database: "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;",
  queue: "shape=mxgraph.basic.queue;whiteSpace=wrap;html=1;",
  lock: "shape=mxgraph.security.locks;whiteSpace=wrap;html=1;",
  user: "shape=mxgraph.office.users.user;whiteSpace=wrap;html=1;",

  // 容器/泳道
  container: "swimlane;whiteSpace=wrap;html=1;startSize=23;",
  containerBold: "swimlane;fontStyle=1;startSize=23;collapsible=0;",
};

// 预设颜色方案
const COLORS = {
  blue: { fill: "#dae8fc", stroke: "#6c8ebf" },
  green: { fill: "#d5e8d4", stroke: "#82b366" },
  orange: { fill: "#fff2cc", stroke: "#d6b656" },
  red: { fill: "#f8cecc", stroke: "#b85450" },
  purple: { fill: "#e1d5e7", stroke: "#9673a6" },
  gray: { fill: "#f5f5f5", stroke: "#666666" },
  yellow: { fill: "#ffffcc", stroke: "#cccc00" },
  teal: { fill: "#ccffff", stroke: "#009999" },
  pink: { fill: "#ffe6ff", stroke: "#cc00cc" },
};

/**
 * 应用颜色到样式字符串
 */
function applyColor(style, colorName) {
  const c = COLORS[colorName];
  if (!c) return style;
  // 移除已有的 fillColor 和 strokeColor
  let s = style.replace(/fillColor=[^;]*;?/g, "").replace(/strokeColor=[^;]*;?/g, "");
  return `fillColor=${c.fill};strokeColor=${c.stroke};${s}`;
}

/**
 * 获取样式字符串
 */
function getStyle(shapeName) {
  return SHAPES[shapeName] || SHAPES.rect;
}

/**
 * 列出所有可用形状
 */
function listShapes() {
  return Object.keys(SHAPES).sort();
}

module.exports = { SHAPES, COLORS, applyColor, getStyle, listShapes };

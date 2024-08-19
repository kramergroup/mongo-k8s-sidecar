import dns from 'dns';
import logger from './logging.js'
import { networkInterfaces } from 'os';

var getMongoPodLabels = function() {
  return process.env.MONGO_SIDECAR_POD_LABELS || false;
};

var getMongoPodLabelCollection = function() {
  var podLabels = getMongoPodLabels();
  if (!podLabels) {
    return false;
  }

  var labels = process.env.MONGO_SIDECAR_POD_LABELS.split(',');
  for (var i in labels) {
    var keyAndValue = labels[i].split('=');
    labels[i] = {
      key: keyAndValue[0],
      value: keyAndValue[1]
    };
  }
  
  return labels;
};

var getk8sROServiceAddress = function() {
  return process.env.KUBERNETES_SERVICE_HOST + ":" + process.env.KUBERNETES_SERVICE_PORT
};

/**
 * @returns k8sClusterDomain should the name of the kubernetes domain where the cluster is running.
 * Can be convigured via the environmental variable 'KUBERNETES_CLUSTER_DOMAIN'.
 */
var getK8sClusterDomain = function() {
  var domain = process.env.KUBERNETES_CLUSTER_DOMAIN || "cluster.local";
  verifyCorrectnessOfDomain(domain);
  return domain;
};

/**
 * Calls a reverse DNS lookup to ensure that the given custom domain name matches the actual one.
 * Raises a console warning if that is not the case.
 * @param clusterDomain the domain to verify.
 */
var verifyCorrectnessOfDomain = function(clusterDomain) {
  if (!clusterDomain) {
    return;
  }

  var servers = dns.getServers();
  if (!servers || !servers.length) {
    logger.error({ clusterDomain: clusterDomain, servers: servers }, "dns.getServers() didn't return any results when verifying the cluster domain");
    return;
  }

  // In the case that we can resolve the DNS servers, we get the first and try to retrieve its host.
  dns.reverse(servers[0], function(err, host) {
    if (err) {
      logger.warn({ clusterDomain: clusterDomain, servers: servers, err: err }, "Error occurred trying to verify the cluster domain");
    }
    else if (host.length < 1 || !host[0].endsWith(clusterDomain)) {
      logger.warn({ clusterDomain: clusterDomain, host: host }, "Possibly wrong cluster domain name! Detected expected cluster domain to be similar to hostname");
    }
    else {
      logger.info({ clusterDomain: clusterDomain}, "The cluster domain was successfully verified.");
    }
  });
};

/**
 * @returns k8sMongoServiceName should be the name of the (headless) k8s service operating the mongo pods.
 */
var getK8sMongoServiceName = function() {
  return process.env.KUBERNETES_MONGO_SERVICE_NAME || false;
};

/**
 * @returns mongoPort this is the port on which the mongo instances run. Default is 27017.
 */
var getMongoDbPort = function() {
  var mongoPort = process.env.MONGO_PORT || 27017;
  logger.info( {port: mongoPort}, `Using mongo port: ${mongoPort}`);
  return mongoPort;
};

/**
 *  @returns boolean to define the RS as a configsvr or not. Default is false
 */
var isConfigRS = function() {
  var configSvr = (process.env.CONFIG_SVR || '').trim().toLowerCase();
  var configSvrBool = /^(?:y|yes|true|1)$/i.test(configSvr);
  if (configSvrBool) {
    logger.info({configSvr: configSvr}, "ReplicaSet is configured as a configsvr");
  }

  return configSvrBool;
};

/**
 * @returns boolean
 */
var stringToBool = function(boolStr) {
  var isTrue = ( boolStr === 'true' ) || false;

  return isTrue;
};

var redisURL = () => {
  const redisURL = process.env.REDIS_URL || "redis://localhost:6379" ;
  logger.info({redisURL: redisURL}, `Redis URL ${redisURL}`)
  return new URL(redisURL)
}

/**
 * Obtain the local IP addresses
 * 
 * Source: https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
 * 
 * @returns array of string
 */
var localIPs = () => {

  const nets = networkInterfaces();
  const results = []; // Or just '{}', an empty object

  for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
          // const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
          // if (net.family === familyV4Value && !net.internal) {
          if (!net.internal) {
              results.push(net.address);
          }
      }
  }
  return results
}

export default {
  ownIPs: localIPs() || [process.env.POD_IP],
  podName: process.env.POD_NAME,
  namespace: process.env.KUBE_NAMESPACE,
  username: process.env.MONGODB_USERNAME,
  password: process.env.MONGODB_PASSWORD,
  database: process.env.MONGODB_DATABASE || 'local',
  loopSleepSeconds: process.env.MONGO_SIDECAR_SLEEP_SECONDS || 5,
  unhealthySeconds: process.env.MONGO_SIDECAR_UNHEALTHY_SECONDS || 15,
  mongoSSLEnabled: stringToBool(process.env.MONGO_SSL_ENABLED),
  mongoSSLAllowInvalidCertificates: stringToBool(process.env.MONGO_SSL_ALLOW_INVALID_CERTIFICATES),
  mongoSSLAllowInvalidHostnames: stringToBool(process.env.MONGO_SSL_ALLOW_INVALID_HOSTNAMES),
  env: process.env.NODE_ENV || 'local',
  loglevel: process.env.LOG_LEVEL || 'info',
  mongoPodLabels: getMongoPodLabels(),
  mongoPodLabelCollection: getMongoPodLabelCollection(),
  k8sROServiceAddress: getk8sROServiceAddress(),
  k8sMongoServiceName: getK8sMongoServiceName(),
  k8sClusterDomain: getK8sClusterDomain(),
  mongoPort: getMongoDbPort(),
  isConfigRS: isConfigRS(),
  redisURL: redisURL()
};

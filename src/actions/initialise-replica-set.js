import config from '../lib/config.js'
import logger from '../lib/logging.js'
import mongo from '../lib/mongo.js'
import k8s from '../lib/k8s.js'
import { isEmpty } from 'bullmq'

/**
 * Initialises the replica set. 
 * 
 * This function should only be called once in the lifetime of the MongoDB.
 * 
 */
export async function initialiseReplicaSet() {

  try {
    var {db,close} = mongo.getDb()
     
    // The mongoDB replica set is not yet initialised. Lets do this now
    logger.info("MongoDB replica set not yet initialised. Initialising now.")
    if ( !config.ownIPs || isEmpty(config.ownIPs) ) {
      logger.error("Please set the POD_IP environment variable.")
    }
    
    // var pods = await k8s.getMongoPods()
    // var primary = pods.filter( pod => pod.status.podIPs.some( ip => config.ownIPs.some(ip2 => ip && ip === ip2 ) ) )
    var primary = await k8s.getThisPod()

    const primaryStableNetworkAddressAndPort = k8s.getPodStableNetworkAddressAndPort(primary);
    const hostIpAndPort = k8s.getPodIpAddressAndPort(primary);
    
    // Prefer the stable network ID over the pod IP, if present.
    const primaryAddressAndPort = primaryStableNetworkAddressAndPort || hostIpAndPort;
    logger.trace({primary: primaryAddressAndPort}, "Start initialising replicate set")
    await mongo.initReplSet(db, primaryAddressAndPort);
    logger.info({primary: primaryAddressAndPort}, "Initialised replicate set")
    
  } finally {
    if (close) close()
  }
  
}
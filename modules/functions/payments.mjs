import JSONTools from "@hackthedev/json-tools";
import path from "path";
import dSyncPay from '@hackthedev/dsync-pay';

export let paymentConfig = {}
let paymentConfigPath = path.join(path.resolve(), "configs", "payments.json")
export let payments;

export function initPaymentSystem(app){
    // create payments config
    JSONTools.createConfig(paymentConfigPath)

    paymentConfig = JSONTools.getConfig(paymentConfigPath)

    // setup config
    JSONTools.checkObjectKeys(paymentConfig, "paypal.sandbox.id", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.sandbox.secret", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.live.id", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.live.secret", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.use_sanbox", true, true)
    //
    JSONTools.checkObjectKeys(paymentConfig, "coinbase.key", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "coinbase.webhook", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "domain", "http://localhost:2052", true)
    //
    JSONTools.saveConfig(paymentConfigPath, paymentConfig);

    payments = new dSyncPay({
        app,
        domain: paymentConfig.domain,
        paypal: {
            clientId: paymentConfig.paypal.sandbox.id,
            clientSecret: paymentConfig.paypal.sandbox.secret,
            sandbox: paymentConfig.paypal.use_sandbox
        },
        coinbase: {
            apiKey: paymentConfig.coinbase.key,
            webhookSecret: paymentConfig.coinbase.webhook // optional
        },

        onPaymentCreated: (data) => { console.log("Payment Created", data); },
        onPaymentCompleted: (data) => { console.log("Payment completed", data);},
        onPaymentFailed: (data) => { console.log("Payment failed", data);},
        onPaymentCancelled: (data) => { console.log("Payment canceled", data);},
        onSubscriptionCreated: (data) => { console.log("sub Created", data);},
        onSubscriptionActivated: (data) => { console.log("sub activated", data);},
        onSubscriptionCancelled: (data) => { console.log("sub canceled", data);},
    });
}
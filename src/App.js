import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import {AppTon} from "./AppTon";
import React, {useState} from "react";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import BluetoothTransport from "@ledgerhq/hw-transport-web-ble";
import {FakeTransport} from "./FakeTransport";
import TonWeb from "tonweb";

const NEED_SEND = false; // need send queries to blockchain

let ton;
let transport;
let appTon;
let wallet;

function App() {
    const [transportType, setTransportType] = useState('fake');

    const start = async () => {
        ton = new TonWeb();

        switch (transportType) {
            case 'usb':
                transport = await TransportWebUSB.create();
                break;
            case 'hid':
                transport = await TransportWebHID.create();
                break;
            case 'ble':
                transport = await BluetoothTransport.create();
                break;
            case 'fake':
                transport = new FakeTransport(ton);
                break;
            default:
                throw new Error('unknown transportType' + transportType)
        }
        transport.setDebugMode(true);

        appTon = new AppTon(transport, ton);
    }

    const getAppConfig = async () => {
        if (!appTon) {
            alert('Start first');
            return;
        }
        console.log(await appTon.getAppConfiguration());
    }

    const getAddress = async () => {
        if (!appTon) {
            alert('Start first');
            return;
        }
        const result = await appTon.getAddress(0, false);
        console.log(result);
        console.log('receive address', result.address.toString(true, true, true))
        wallet = result.wallet;
    }

    const checkEquals = (a, b) => {
        if (a.length !== b.length) throw new Error('not equal len');
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) throw new Error('not equal');
        }
    }

    const sendQuery = async (query) => {
        const sendResponse = await query.send();
        if (sendResponse["@type"] === "ok") {
            alert('Sent to blockchain');
        } else {
            console.error(sendResponse);
            alert('Send error');
        }
    }

    const deploy = async () => {
        if (!wallet) {
            alert('Start & Get Address first');
            return;
        }

        const result = await appTon.deploy(0, wallet);

        const resultBytes = await (await result.getQuery()).toBoc();
        console.log('Full deploy message is ', resultBytes);

        if (transport.debugDeploy) {
            const debugResult = await transport.debugDeploy();
            const debugResultBytes = await (await debugResult.getQuery()).toBoc();
            console.log('DEBUG ledger deploy message is ', debugResultBytes);

            checkEquals(resultBytes, debugResultBytes)
        }

        if (NEED_SEND) {
            await sendQuery(result);
        }
    }

    const transfer = async () => {
        if (!wallet) {
            alert('Start & Get Address first');
            return;
        }

        const TO_ADDRESS = 'EQA0i8-CdGnF_DhUHHf92R1ONH6sIA9vLZ_WLcCIhfBBXwtG';
        const AMOUNT = TonWeb.utils.toNano(0.123);

        const selfAddress = await wallet.getAddress();
        const walletInfo = await ton.provider.getWalletInfo(selfAddress.toString());
        let seqno = walletInfo.seqno;
        if (!seqno) seqno = 1; // if contract not initialized, use seqno = 1

        const result = await appTon.transfer(0, wallet, TO_ADDRESS, AMOUNT, seqno);

        const resultBytes = await (await result.getQuery()).toBoc();
        console.log('Full transfer message is ', resultBytes);

        if (transport.debugTransfer) {
            const debugResult = await transport.debugTransfer(TO_ADDRESS, AMOUNT, seqno);
            const debugResultBytes = await (await debugResult.getQuery()).toBoc();
            console.log('DEBUG ledger transfer message is ', debugResultBytes);

            checkEquals(resultBytes, debugResultBytes)
        }

        if (NEED_SEND) {
            await sendQuery(result);
        }
    }

    return (
        <div className="App">
            <select value={transportType} onChange={e => setTransportType(e.currentTarget.value)}>
                <option value="hid">HID</option>
                <option value="usb">USB</option>
                <option value="ble">Bluetooth</option>
                <option value="fake">Fake</option>
            </select>
            <div>
                <button onClick={() => start()}>Start</button>
            </div>
            <div>
                <button onClick={() => getAppConfig()}>Get App Config</button>
            </div>
            <div>
                <button onClick={() => getAddress()}>Get Address</button>
            </div>
            <div>
                <button onClick={() => deploy()}>Deploy</button>
            </div>
            <div>
                <button onClick={() => transfer()}>
                    Transfer 0.123 TON to EQA0i8-CdGnF_DhUHHf92R1ONH6sIA9vLZ_WLcCIhfBBXwtG
                </button>
            </div>
        </div>
    );
}

export default App;

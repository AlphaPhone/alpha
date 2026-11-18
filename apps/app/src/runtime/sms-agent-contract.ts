/** Shared reviewed upstream SMS contract (@elizaos/contracts/sms-send); admission requires the corresponding prepared pin. */
export {isSmsSend,validateSmsResult,SMS_SEND_CAPABILITY} from '../../../../.eliza/client-features/packages/contracts/src/sms-send.ts';
import {sha256Hex} from '../lib/hash.ts';
import {smsBindingText,smsReceiptOutcome,type SmsSendOperation,type SmsSendResult} from '../../../../.eliza/client-features/packages/contracts/src/sms-send.ts';
export function smsAgentHash(operation:SmsSendOperation){return sha256Hex(smsBindingText(operation));}
export function smsDeviceStatus(result:SmsSendResult):'succeeded'|'failed'|'unknown'{const outcome=smsReceiptOutcome(result);return outcome==='applied'?'succeeded':outcome==='failed'?'failed':'unknown';}

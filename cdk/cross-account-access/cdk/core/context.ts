import { Node } from "constructs";

export class Context {

    private readonly _node: Node;
    
    private _region: string;
    private _trustedAccountId: string;
    private _trustingAccountId: string;

    constructor(node: Node) {
        this._node = node;    
    }

    getRegion = (): string => {
        if (!this._region) {
            this._region = this._node.tryGetContext('region');
        }
        return this._region;
    }
    getTrustedAccountId = (): string => {
        if (!this._trustedAccountId) {
            this._trustedAccountId = this._node.tryGetContext('trusted-account-id');
        }
        return this._trustedAccountId;
    }
    getTrustingAccountId = (): string => {
        if (!this._trustingAccountId) {
            this._trustingAccountId = this._node.tryGetContext('trusting-account-id');
        }
        return this._trustingAccountId;
    }
}
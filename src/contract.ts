import {
  assert,
  call,
  initialize,
  LookupMap,
  near,
  NearBindgen,
  NearPromise,
  view,
} from "near-sdk-js";

type AccountId = string;

interface FungibleTokenMetadata {
  spec: string;
  name: string;
  symbol: string;
  icon: string | null;
  reference: string | null;
  reference_hash: string | null;
  decimals: number;
}

@NearBindgen({ requireInit: true })
class FungibleToken {
  totalSupply: bigint = BigInt(0);
  balances = new LookupMap<bigint>("balances");
  metadata: FungibleTokenMetadata;

  constructor() {
    this.metadata = {
      spec: "ft-1.0.0",
      name: "TDJS",
      symbol: "TTTTTTDJS",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 288 288'%3E%3Cg id='l' data-name='l'%3E%3Cpath d='M187.58,79.81l-30.1,44.69a3.2,3.2,0,0,0,4.75,4.2L191.86,103a1.2,1.2,0,0,1,2,.91v80.46a1.2,1.2,0,0,1-2.12.77L102.18,77.93A15.35,15.35,0,0,0,90.47,72.5H87.34A15.34,15.34,0,0,0,72,87.84V201.16A15.34,15.34,0,0,0,87.34,216.5h0a15.35,15.35,0,0,0,13.08-7.31l30.1-44.69a3.2,3.2,0,0,0-4.75-4.2L96.14,186a1.2,1.2,0,0,1-2-.91V104.61a1.2,1.2,0,0,1,2.12-.77l89.55,107.23a15.35,15.35,0,0,0,11.71,5.43h3.13A15.34,15.34,0,0,0,216,201.16V87.84A15.34,15.34,0,0,0,200.66,72.5h0A15.35,15.35,0,0,0,187.58,79.81Z'/%3E%3C/g%3E%3C/svg%3E",
      reference: "https://rferenceexample.com",
      reference_hash: "https://rferenceexample.com",
      decimals: 18,
    };
  }

  @initialize({})
  init(
    { owner_id, total_supply }: { owner_id: AccountId; total_supply: string },
  ): void {
    this.totalSupply = BigInt(total_supply);
    this.balances.set(owner_id, this.totalSupply);

    near.log(
      `EVENT_JSON:{"standard":"nep141","version":"1.0.0","event":"ft_mint","data":[{"owner_id":${owner_id.toString()},"amount":${total_supply.toString()},"memo":"Initial tokens supply is minted"}]}`,
    );
  }

  @view({})
  ft_total_supply(): string {
    return this.totalSupply.toString();
  }

  @view({})
  ft_balance_of({ account_id }: { account_id: AccountId }): string {
    return this.balances.get(account_id).toString();
  }

  @view({})
  ft_metadata(): FungibleTokenMetadata {
    return this.metadata;
  }

  @call({ payableFunction: true })
  storage_deposit(
    { account_id, register_only }: {
      account_id?: AccountId;
      register_only?: boolean;
    },
  ): void {
    const accountId = account_id || near.predecessorAccountId();
    const attachedDeposit = near.attachedDeposit();
    const MIN_STORAGE_BALANCE = BigInt("1250000000000000000000"); // 0.00125 NEAR

    assert(
      attachedDeposit > MIN_STORAGE_BALANCE,
      `The attached deposit is less than the minimum storage balance (${MIN_STORAGE_BALANCE})`,
    );

    if (!this.balances.get(accountId)) {
      this.balances.set(accountId, BigInt(0));
    }
  }

  @call({ payableFunction: true })
  ft_transfer({
    receiver_id,
    amount,
    memo,
  }: {
    receiver_id: AccountId;
    amount: string;
    memo?: string;
  }): void {
    const senderId = near.predecessorAccountId();
    const transferAmount = BigInt(amount);
    const senderBalance = this.balances.get(senderId);
    const receiverBalance = this.balances.get(receiver_id);
    // Assertions

    // Update user balances
    this.balances.set(senderId, senderBalance - transferAmount);
    this.balances.set(receiver_id, receiverBalance + transferAmount);


    const ftTransferEvent = {
      standard: "nep141",
      version: "1.0.0",
      event: "ft_transfer",
      data: [{
        old_owner_id: senderId,
        new_owner_id: receiver_id,
        amount: transferAmount.toString(),
        memo,
      }]
    };

    // Emit transfer event
    near.log(`EVENT_JSON:${JSON.stringify(ftTransferEvent)}`);
  }
}

import redis from '@/utils/redis';

export class CartService {
  private static getCartKey(tableId: string): string {
    return `cart:${tableId}`;
  }

  static async getCart(tableId: string): Promise<any> {
    const cartData = await redis.get(this.getCartKey(tableId));
    return cartData ? JSON.parse(cartData) : { items: [] };
  }

  static async clearCart(tableId: string): Promise<void> {
    await redis.del(this.getCartKey(tableId));
  }
}

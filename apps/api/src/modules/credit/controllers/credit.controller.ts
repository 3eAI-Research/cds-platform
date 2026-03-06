import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { CreditService } from '../services/credit.service';
import { ListTransactionsDto } from '../dto/credit.dto';

@ApiTags('Credits')
@Controller('credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  /**
   * GET /api/v1/credits
   * Get the authenticated user's credit balance.
   */
  @ApiOperation({ summary: 'Get current credit balance' })
  @Roles('customer', 'provider_owner')
  @Get()
  async getBalance(@CurrentUser() user: AuthUser) {
    return this.creditService.getBalance(user.userId);
  }

  /**
   * GET /api/v1/credits/transactions
   * Get paginated credit ledger transactions for the authenticated user.
   */
  @ApiOperation({ summary: 'List credit transactions (ledger)' })
  @Roles('customer', 'provider_owner')
  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTransactionsDto,
  ) {
    return this.creditService.getTransactions(
      user.userId,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  /**
   * GET /api/v1/credits/admin/balances
   * List all user credit balances (admin only).
   */
  @ApiOperation({ summary: 'List all user credit balances (admin)' })
  @Roles('admin')
  @Get('admin/balances')
  async getAdminBalances(@Query() query: ListTransactionsDto) {
    return this.creditService.getAllBalances(
      query.page ?? 1,
      query.pageSize ?? 50,
    );
  }
}

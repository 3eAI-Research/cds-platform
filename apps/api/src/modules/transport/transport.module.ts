import { Module } from '@nestjs/common';
import { EstateTypeController } from './controllers/estate-type.controller';
import { FurnitureTypeController } from './controllers/furniture-type.controller';
import { PostCodeController } from './controllers/post-code.controller';
import { TransportController } from './controllers/transport.controller';
import { AddressService } from './services/address.service';
import { EstateService } from './services/estate.service';
import { EstateTypeService } from './services/estate-type.service';
import { FurnitureTypeService } from './services/furniture-type.service';
import { PostCodeService } from './services/post-code.service';
import { TransportationService } from './services/transportation.service';
import { VolumeCalculatorService } from './services/volume-calculator.service';

@Module({
  controllers: [
    EstateTypeController,
    FurnitureTypeController,
    PostCodeController,
    TransportController,
  ],
  providers: [
    AddressService,
    EstateService,
    EstateTypeService,
    FurnitureTypeService,
    PostCodeService,
    TransportationService,
    VolumeCalculatorService,
  ],
  exports: [
    AddressService,
    EstateService,
    EstateTypeService,
    FurnitureTypeService,
    PostCodeService,
    TransportationService,
    VolumeCalculatorService,
  ],
})
export class TransportModule {}

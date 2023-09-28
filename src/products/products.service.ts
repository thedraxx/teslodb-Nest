import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findAll() {
    try {
      return await this.productRepository.find();
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findOne(id: string) {
    try {
      const isExistsInDB = await this.productRepository.findOne({
        where: { id: id },
      });
      return isExistsInDB;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  // update(id: number, updateProductDto: UpdateProductDto) {
  //   return `This action updates a #${id} product`;
  // }

  async remove(id: string) {
    try {
      await this.productRepository.delete(id);
      return { message: 'product deleted successfully' };
    } catch (error) {
      this.handleDBException(error);
    }
    return `This action removes a #${id} product`;
  }

  private handleDBException(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error.message, error.stack);
    throw new InternalServerErrorException(
      'unexpected error, check server logs',
    );
  }
}

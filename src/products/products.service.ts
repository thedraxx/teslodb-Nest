import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage } from './entities';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...ProductDetails } = createProductDto;

      const product = this.productRepository.create({
        ...ProductDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
      });

      await this.productRepository.save(product);

      return { ...product, images };
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    try {
      return await this.productRepository.find({ skip: offset, take: limit }); // TODO: RELACIONES
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findOne(term: any) {
    let product: Product;
    if (isUUID(term)) {
      return await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toUpperCase(),
        })
        .getOne();
    }

    if (!product) {
      throw new BadRequestException(`Product #${term} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto,
      images: [],
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    try {
      return await this.productRepository.save(product);
    } catch (error) {
      this.handleDBException(error);
    }
  }

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

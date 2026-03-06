package com.example.nextgen_pds_kiosk.di

import com.example.nextgen_pds_kiosk.data.api.DispenserApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // Base default IP of ESP8266 when connected to Android Mobile Hotspot
    private const val DEFAULT_ESP8266_URL = "http://192.168.43.100/"

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        @dagger.hilt.android.qualifiers.ApplicationContext context: android.content.Context
    ): Retrofit {
        val sharedPrefs = context.getSharedPreferences("kiosk_settings", android.content.Context.MODE_PRIVATE)
        val dynamicBaseUrl = sharedPrefs.getString("esp8266_ip", DEFAULT_ESP8266_URL) ?: DEFAULT_ESP8266_URL

        return Retrofit.Builder()
            .baseUrl(dynamicBaseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideDispenserApiService(retrofit: Retrofit): DispenserApiService {
        return retrofit.create(DispenserApiService::class.java)
    }
}
